import { addPlugin } from 'react-native-flipper';

const reduxDebuggerPlugin = {
  connection: null,
  store: null,
  getId: () => 'RNReduxDebugger',
  onConnect: (connection) => {
    this.connection = connection;

    // Custom dispatch
    connection.receive('dispatch', (action, responder) => {
      try {
        if (this.store) {
          if (Array.isArray(action)) {
            action.forEach((a) => this.store.dispatch(a));
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

export default () => {
  addPlugin(reduxDebuggerPlugin);

  return (store) => (next) => (action) => {
    reduxDebuggerPlugin.setStore(store);

    let result;

    try {
      const prevState = store.getState();
      const startTime = Date.now();
      result = next(action);

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
