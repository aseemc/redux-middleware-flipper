import { addPlugin } from 'react-native-flipper';

const reduxDebuggerPlugin = {
  connection: null,
  store: null,
  actionReplayDelay: 0,
  getId: () => 'RNReduxDebugger',
  onConnect: (connection) => {
    this.connection = connection;

    // Custom dispatch
    connection.receive('dispatch', (action, responder) => {
      try {
        if (this.store) {
          if (Array.isArray(action)) {
            action.forEach((a, index) => {
              if (index === 0) {
                this.store.dispatch(a);
              } else {
                setTimeout(() => this.store.dispatch(a), this.actionReplayDelay * index);
              }
            });
          } else {
            this.store.dispatch(action);
          }
          responder.success({ ack: true });
        }
      } catch (error) {
        responder.error(error);
      }
    });
  },
  onDisconnect: () => {
    this.connection = null;
  },
  setStore: (store) => {
    this.store = store;
  },
  setActionReplayDelay: (delay) => {
    this.actionReplayDelay = delay;
  },
  sendAction: ({ action, requestTime, prevState, nextState, duration }) => {
    if (this.connection) {
      this.connection.send('action', {
        id: requestTime,
        requestTime,
        action,
        prevState,
        nextState,
        duration,
      });
    }
  },
  sendError: (error) => {
    this.connection.reportError(error);
  },
};

export default ({
  actionsBlacklist = [],
  actionsWhitelist = [],
  actionReplayDelay = 500,
}) => {
  addPlugin(reduxDebuggerPlugin);

  return (store) => (next) => (action) => {
    reduxDebuggerPlugin.setStore(store);
    reduxDebuggerPlugin.setActionReplayDelay(actionReplayDelay);

    let result;

    try {
      const prevState = store.getState();
      const startTime = Date.now();
      result = next(action);

      if (actionsBlacklist.length && actionsBlacklist.includes(action.type)) {
        return result;
      }
      
      if (actionsWhitelist.length) {
        if (actionsWhitelist.includes(action.type)) {
          reduxDebuggerPlugin.sendAction({
            action,
            requestTime: startTime,
            prevState,
            nextState: store.getState(),
            duration: `${Date.now() - startTime} ms`,
          });
        }

        return result;
      } 
      
      reduxDebuggerPlugin.sendAction({
        action,
        requestTime: startTime,
        prevState,
        nextState: store.getState(),
        duration: `${Date.now() - startTime} ms`,
      });
    } catch (error) {
      reduxDebuggerPlugin.sendError(error);
      console.error('[redux-middleware-flipper]: ', error);
    }

    return result;
  };
};
