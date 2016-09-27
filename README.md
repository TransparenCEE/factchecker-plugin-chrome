# Factual Chrome extension

## Releases
For the latest packaged version check the [releases](https://github.com/TransparenCEE/factchecker-plugin-chrome/releases) page. Drop the `crx` file in the Chrome extensions page (`chrome://extensions/`).

## Installation

* Install NodeJS from https://nodejs.org/
* ```npm install -g gulp webpack```
* ```npm install```

## Running

* ```gulp```
* In the Chrome extensions page, ```Load unpacked extension...``` and select the ```build``` directory.

The extension will automatically reload on code changes.

## Updating code

* ```git pull origin branch_name```
* ```npm install```

## Creating a build

* ```gulp build``` will generate a build in ```./dist```.
