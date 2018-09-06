const cluster = require('cluster');

/**
 * This Webpack plugin is based on
 * https://github.com/ericclemmons/start-server-webpack-plugin/blob/master/src/StartServerPlugin.js
 */
class RestartServerPlugin {
  constructor(options) {
    this.options = options;

    this.afterEmit = this.afterEmit.bind(this);
    this.apply = this.apply.bind(this);
    this.startServer = this.startServer.bind(this);

    this.worker = null;
  }

  apply(compiler) {
    // Use the Webpack 4 Hooks API when possible.
    if (compiler.hooks) {
      const plugin = {name: 'RestartServerPlugin'};

      compiler.hooks.afterEmit.tapAsync(plugin, this.afterEmit);
    } else {
      compiler.plugin('after-emit', this.afterEmit);
    }
  }

  afterEmit(compilation, callback) {
    if (this.worker && this.worker.isConnected()) {
      this.worker.on('exit', () => {
        this.startServer(compilation, callback);
      });
      process.kill(this.worker.process.pid, this.options.signal);
    } else {
      // worker isn't running yet, so start it..
      this.startServer(compilation, callback);
    }
  }

  startServer(compilation, callback) {
    const {options} = this;
    let name;
    const names = Object.keys(compilation.assets);
    if (options.name) {
      name = options.name;
      if (!compilation.assets[name]) {
        throw new Error(
          'Entry ' + name + ' not found. Try one of: ' + names.join(' ')
        );
      }
    } else {
      name = names[0];
      if (names.length > 1) {
        console.log(
          '\nMore than one entry built, selected ' +
            name +
            '. All names: ' +
            names.join(' ') +
            '\n'
        );
      } else if (names.length == 0) {
        throw new Error('No compilation entries found!');
      }
    }
    const {existsAt} = compilation.assets[name];

    const execArgv = this._getArgs();
    const inspectPort = this._getInspectPort(execArgv);

    const clusterOptions = {
      exec: existsAt,
      execArgv,
    };

    if (inspectPort) {
      clusterOptions.inspectPort = inspectPort;
    }
    cluster.setupMaster(clusterOptions);

    this.worker = cluster.fork();
    this.worker.once('online', callback);
  }

  _getArgs() {
    const {options} = this;
    const execArgv = (options.nodeArgs || []).concat(process.execArgv);
    if (options.args) {
      execArgv.push('--');
      execArgv.push.apply(execArgv, options.args);
    }
    return execArgv;
  }

  _getInspectPort(execArgv) {
    const inspectArg = execArgv.find(arg => arg.includes('--inspect'));
    if (!inspectArg || !inspectArg.includes('=')) {
      return;
    }
    const hostPort = inspectArg.split('=')[1];
    const port = hostPort.includes(':') ? hostPort.split(':')[1] : hostPort;
    return parseInt(port);
  }
}

module.exports = RestartServerPlugin;

module.exports = (neutrino, options = {}) => neutrino.config
  .plugin(options.pluginId || 'restart-server')
  .use(RestartServerPlugin, [{
    name: options.name,
    signal: options.signal || 'SIGTERM',
    nodeArgs: options.debug ? ['--inspect'] : []
  }]);
