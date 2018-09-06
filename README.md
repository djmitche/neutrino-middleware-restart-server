`neutrino-middleware-restart-server` is a Neutrino Middleware that will
automatically restart a server on each rebuild. It is similar to
`@neutrinojs/start-server`, but that plugin only starts the server once.

## Get Started

```sh
npm install --save-dev neutrino-middleware-restart-server
```

```js
module.exports = {
  use: [
    'neutrino-middleware-restart-server',
    {
      name: 'index.js',  // name of the entry to run as a server
                         // default: first and only entry
      signal: 'SIGTERM', // signal to send to kill the server; default: SIGTERM
      debug: false,      // if true, run node with --inspect-port
    }
  ]
}
```
