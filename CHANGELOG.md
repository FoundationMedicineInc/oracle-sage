# VERSION 1.1.0
- default conversion of RAW to uppercase HEX strings (previously was lowercase, but Oracle is case sensitive)
- added transform function to Sage Schemas for converting output (see docs)
- development upgrades (lint, prettier, pre-commit hooks, babel upgrades, etc...)

# VERSION 1.1.1
- critical bug fix - normalize was interpreting all numbers as integers when using the model `create` method (issue should be isolated to only this method)
    - the normalize method will no longer parse values as integers, but the validate method will enforce that your input must be a number (unless a custom validator is provided)\

# VERSION 1.1.2
- creates execute and connect base functionality now exposed through _execute and _connect methods so _execute and _connect can easily be extended

# Version 1.1.5
- adds an `execWithBindParams` method to the sage `select` method and also allows the options used with `exec` or `execWithBindParams` to be passed down to the node oracledb driver (useful for setting things like the max rows on a particular call)
- this new method was added to preserve backwards compatibility of the `exec` method while providing an API that is consistent with the rest of the library (for the future this is a good case to pass all parameters in a wrapper object and destructure so ordering of arguments doesn't matter)
- `exec` can also be used with `bindParams` now but these must be passed second which is somewhat antithetical to the way the rest of the library works (`bindParams` always come before options)