# saboteur-rock
Svelte rewrite of Saboteur Rock

## Installation

### npm

Install [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and then run the following script

```sh
npm --prefix ./client install && npm --prefix ./server install
```

### Containers

We're going to use [Podman](https://podman.io/) in place of Docker, since it's open source and gets around Docker licenses. Largely, they're interchangeable.

Please reference the [installation page](https://podman.io/docs/installation) to download and install Podman on your operating system.

You may also need to install the docker-compose engine in order to use compose files.

[Podman Desktop](https://podman-desktop.io/) is also recommended if you want a UI.

## Running

When ran, the client will be available on `http://localhost:5173/` and the server will be available on `http://localhost:2567`.

```sh
# check each service independently
curl http://localhost:2567/healthcheck
curl http://localhost:5173/healthcheck
```

### Local

This will run the services outside of containers, useful for using auto-reload when making changes.

```sh
# from root dir, in separate terminal instances
npm --prefix ./client run dev 
npm --prefix ./server start 
```

### Containers

You can use the following Podman commands to start the appropriate containers

```sh
# build the client
podman build -t sr-client ./client

# build the server
podman build -t sr-server ./server

# run the client 
podman run -d -network host --name sr-client sr-client

# run the server
podman run -d -network host --name sr-server sr-server

# build & run
podman build -t sr-client ./client && podman run -d --replace --network host --name sr-client sr-client 
podman build -t sr-server ./server && podman run -d --replace --network host --name sr-server sr-server

# check pods (or use podman-desktop)
podman ps

# kill pods (or CTRL+C kill the pod if not detached)
podman kill sr-client
podman kill sr-server
```

#### Note on Networking

When connecting locally, make sure to include the `--network host` when running `<docker / podman> run`. This allows the services to share the same networking stack as your local machine, which will allow them to use 'localhost' for network resolution. 

This is also done in the compose file by using the `network_mode: "host"` configuration.

Using this configuration means we don't have to export any ports back to the host machine, since they will natively use the host machine's network stack. 

Note that this is bad practice for deployments, but it works well for local environments.

#### Compose

Compose is supported for near-term ease of use, but will be removed / deprecated in favor of Quadlets once I understand them. 

This is the one time I recommend the GUI, it makes managing the detached containers easier.

```sh
# may need to start socket server for compose compat
systemctl --user enable podman.socket
systemctl --user enable podman
systemctl --user start podman.socket
systemctl --user start podman

podman compose build
podman compose up -d
podman compose up --build --force-recreate -d
podman compose down
```