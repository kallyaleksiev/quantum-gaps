This is a graph and JSON visualisation of the quantum gaps analysis graph.

## Running

### Dependencies 

It is recommended to use [`pnpm`](https://pnpm.io). To install it run 

```
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Configuration

To set a default root node use the `NEXT_PUBLIC_QG_ROOT_NODE` envrionment variable. For example add an `.env` file with 

```
NEXT_PUBLIC_QG_ROOT_NODE=Algorithms
```

You can also set the root node from the UI later.

### Dev

Inside the `graph-vis` directory run:

`pnpm dev`