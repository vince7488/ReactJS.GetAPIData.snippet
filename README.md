![ReactJS Logo. Subjected to Copyright. Facebook Inc. From Wikimedia.org](https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg)

# ReactJS.GetAPIData.snippet
*Use an API data and output API data into Bootstrap4 cards.*

version: 0.0.100

Author: **[Vernard Mercader](http://vernard.net)**

Credits: To our teacher, **[Samer Buna](http://edgecoders.com)**

KeywordS: React,Express,Node,Webpack,Babel,Axios,Bootstrap4

I'm going to build an environment using NodeJS, Express and Webpack, then React-away from there. The goal for this small react Module is to use a simple Method that grabs API AJAX data, and output an API "Document" as a card containing information to a specific unique key.  I'll be using [Bootstrap4](https://getbootstrap.com/docs/4.0/getting-started/introduction/) framework—through react—designing the UI, and the API will be from [GitHub](https://api.github.com).  The module is simple: it consists of a textbox and a submit button that will accept a valid GitHub username (and **displays an error alert** if the user name is invalid), and on user execution, it will display a rectangular card containing the GitHub User's Profile Name, Profile Company, Link to the GitHub Profile, and their Avatar Image.

## Init:

1. npm -y init
2. npm install --save express react react-dom
3. npm install --save-dev webpack webpack-cli babel-loader @babel/core @babel/preset-react @babel/plugin-proposal-class-properties html-webpack-plugin 

After initialisation, creating the entry point (start.js (others like it app.js))

Additionally, run the following:

* npm i --save-dev clean-webpack-plugin 
* npm install jquery
* npm install --save-dev jquery popper.js
* npm install bootstrap
* npm i --save-dev react-bootstrap
* npm install less
* npm i --save-dev less-loader
* npm i --save-dev css-loader style-loader postcss-loader
* npm i --save-dev autoprefixer cssnano
* npm i --save-dev mini-css-extract-plugin
* npm i --save-dev less-plugin-clean-css
* npm i --save-dev file-loader
* npm i --save-dev terser-webpack-plugin
* npm i --save-dev axios