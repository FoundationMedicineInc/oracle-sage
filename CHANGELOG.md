# VERSION 1.1.0
- default conversion of RAW to uppercase HEX strings (previously was lowercase, but Oracle is case sensitive)
- added transform function to Sage Schemas for converting output (see docs)
- development upgrades (lint, prettier, pre-commit hooks, babel upgrades, etc...)

# VERSION 1.1.1
- critical bug fix - normalize was interpreting all numbers as integers when using the model `create` method (issue should be isolated to only this method)
    - the normalize method will no longer parse values as integers, but the validate method will enforce that your input must be a number (unless a custom validator is provided)