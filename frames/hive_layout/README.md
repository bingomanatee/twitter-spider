hive_layout
===========

A foundational frame for adding a layout to your pages

hive_layout uses a post-render filter to encase action output in a page wrapper. `action` level `$out` parameters are exposed to the layout. 

To choose which template to use set the `layout_name` configuration property. This property can be sat at:

* the `hive` configuration file
* the `action` configuration file
* the action's `$out' property

If this property is unset, no layout will be used. 

Also, layouts are only applied to HTML output; data that is sent via `context.$send` (or actions without a template)
 will not be affected by hive_layout.

## What this is

This is NOT a node module! Frames are part of a web project using hive-mvc. You can embed this module in your frames folder.

## The Javascript helper

Javascript can be annotated and embedded via helpers. Just list javascript in an array in your action or layout configuration file.

Each javascript entry must contain the following parameters:

``` json

{
    "url": "/String/to/file.js",
    "context": "string ('head','foot', or any other in your layout)"
    "defer": "boolean (true/false) -- optional"
    "name": "string -- optional",
    "requires": ["name, name... --optional"]
    }

```
then just embed

``` ejs

<%- js_model.render('head') %>

<%- js_model.render('foot') %>

```

in your template to include javascript `<script>...</script>` tags in your page.

Note, the "requires" array is documentary -- it is not enforced through code.

## The starting template

A single Twitter Boostrap template is included as a starting point. It uses the hive-menu node module. **note: hive-menu
is <u>NOT</u> in the hive_layout `package.json` file!" because you aren't obligated to use the bootstrap layout,
it is up to you to decide whether you want to use hive_menu in your project or not.

The starting template is a responsive layout with a left-navigation and top navigation bar. It demonstrates
how you can mixin layout-specific view helpers.