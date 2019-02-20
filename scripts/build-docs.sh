rm -rf docs/*
./node_modules/.bin/typedoc --mode file --theme minimal --target "ES6" --exclude "**/*.test.ts,**/testHelpers/*" --hideGenerator --excludeExternals --excludeNotExported --includeDeclarations --readme none --out docs
