# Hive-Loader

Hive Loader is a component that digests and acts on a targeted directory. It is a self-sufficient component but its methods are also mixable into other components.

## Methods

`load(path, cb, [handlers], include_local)`

analyzes a given directory against a set of handlers, and/or contents of the handlers configuration.

the included unit test, loader, is a basic scanner that recursively looks for and returns a list of all
files matching a given type.

Note that the default context for the `response()` method of all handlers is the loader component. However,
by setting the target parameter of the handler, you can manually determine the "this" context of a given
handler. (that is how all the files of the recursive file scanner are dumped to the root.)

the `handles()` method, on the other hand, is always contextualized to the handler itself.

