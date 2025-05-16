module.exports = {
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Add any before middlewares here
      if (devServer.options.onBeforeSetupMiddleware) {
        devServer.options.onBeforeSetupMiddleware(devServer);
      }

      // Return middlewares as is
      middlewares.push(...(devServer.options.middlewares || []));

      // Add any after middlewares here
      if (devServer.options.onAfterSetupMiddleware) {
        devServer.options.onAfterSetupMiddleware(devServer);
      }

      return middlewares;
    }
  }
};
