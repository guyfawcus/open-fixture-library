# JSON Fixture Format

This document gives a high-level overview of the concepts used in the JSON format of the fixture definitions collected in the *Open Fixture Library*. Those fixture definitions (also called *personalities* or *profiles*) specify information about a fixture's DMX controlment and general attributes.

*Note:* The fixture format is not intended to be used directly by other software, as it may introduce breaking, not-backwards-compatible changes at any time. Instead, write a plugin to transform the data into a more stable format for your application. Internally in *OFL*, working with the [fixture model](fixture-model.md) is preferred, as it eases access to the fixture data.


#### Table of contents
- [Schema](#schema)
- [Goals](#goals)
- [Directory structure](#directory-structure)
- [Fixture](#fixture)
  - [Modes](#modes)
  - [Channels](#channels)
    - [Capabilities](#capabilities)
    - [Fine channels](#fine-channels)
    - [Switching channels](#switching-channels)
  - [Matrices](#matrices)
    - [Matrix structure](#matrix-structure)
    - [Template channels](#template-channels)
  - [RDM (Remote Device Management) data](#rdm-remote-device-management-data)


## Schema

The [JS Schema](https://github.com/molnarg/js-schema) can be found in the [`schema.js`](../fixtures/schema.js) file. It is a declarative way to describe allowed properties and values. The [`fixtures-valid.js` test](../tests/fixtures-valid.js) automatically checks the fixtures against this schema and additionally tests things like the correct use of channel keys etc. programmatically.

The schema exports a property `VERSION`. Every time the schema is updated, this version needs to be incremented using [semantic versioning](http://semver.org).

Given a version number MAJOR.MINOR.PATCH, increment the:
1. MAJOR version when you make incompatible schema changes.  
  i.e. old fixtures are not valid with the new schema anymore.
2. MINOR version when you add functionality in a backwards-compatible manner.
  i.e. old fixtures are still valid with the new schema, new fixtures aren't valid with the old schema.
3. PATCH version when you make backwards-compatible bug fixes.
  e.g. an upper bound to an integer value is added, which was likely done right in the past anyway.


## Goals

The JSON fixture format is intended to be

* readable by both humans and machines
* easily extendable
* as general as possible to include information for many fixture formats
* abstract where possible, specific where needed


## Directory structure

The manufacturer of a fixture is determined by its toplevel directory (relative to the `fixtures` directory), the fixture key is the filename without extension. Manufacturer data is stored in [`manufacturers.json`](../fixtures/manufacturers.json).

`register.js` (which is generated by [`generate-register.js`](../cli/generate-register.js)) is just an index to make searching specific attributes possible without having to read the whole directory structure, which makes it faster.


## Fixture

A fixture's `shortName` must be unique amongst all fixtures.

The `physical` section describes properties not directly used in the DMX protocol, but often in lighting control software to display a preview of the fixtures in action.


### Modes

A fixture can have multiple *modes* (also sometimes called *personalities*) like "Basic 3-channel mode" or "Extended 5-channel mode". Our modes are not allowed to have the word "mode" in them, as it is automatically appended at the end.

A mode can contain the `physical` property to override specific physical data of the fixture. E.g. one mode could set the `panMax` value different than the fixture default.

A mode's `shortName` must be unique amongst all modes of the respective fixture.


### Channels

All channels that are used in one or more modes are listed in `availableChannels`. The modes then only contain a list of the channel keys.

A channel's `defaultValue` is the DMX value that this channel is set to without the user interacting (most often, this will be `0`, but e.g. for Pan and Tilt channels, other values make more sense). Likewise, `highlightValue` specifies the DMX value if a user *highlights* this channel (defaults to the maximum DMX value). This is not available in every software.

`invert` is used to mark a descending value (e.g. Speed from fast to slow). If `constant` is `true`, the channel cannot be changed. Set `crossfade` to `true` if you want to allow smooth transitions between two DMX values being output by the software. This is e.g. not recommended for Gobo wheels, as there can be no *smooth* transition to another Gobo; the wheel will always rotate.

`precedence` specifies to which value the channel should be set if there are two conflicting active cues containing this channel: *HTP* (Highest takes precedence) or *LTP* (Latest (change) takes precedence).


#### Capabilities

A channel can do different things depending on which range its DMX value currently is in. Those capabilities can be triggered manually in many programs, and the `menuClick` property defines how: `start` / `center` / `end` sets the channel's DMX value to the start / center / end of the range, respectively. `hidden` hides this capability from the trigger menu.


#### Fine channels

A channel can list `fineChannelAliases` to specify which channel keys are used to describe its finer variants. This results in two or more (8 bit) channels being combined into one 16 bit (or 24 bit, ...) channel to increase the resolution of the controlled functionality.

Example: Channel `Dimmer` contains `fineChannelAliases: ["Dimmer 16-bit", "Dimmer 24-bit"]`. Mode "Normal" uses only `Dimmer` in its channel list, mode "Fine" uses `Dimmer` and `Dimmer 16-bit`, mode "Super fine" uses all three.

See the [Generic Desk Channel fixture](../fixtures/generic/desk-channel.json) for a simple application example.


#### Switching channels

A *switching channel* is a channel whose functionality depends on the value of another channel in the same mode.

E.g. in a given mode, the first channel could be used to select auto-programs and channel 2 could be either "Microphone Sensitivity" (if channel 1 is set to *Sound control*) or "Program Speed" (if channel 1 is set to anything else).

To define switching channels, add a `switchChannels` object to all capabilities of the dependency channel (the "Auto-Programs" channel in the example above). This object defines which *switching channel alias* is set to which *available channel key* if this capability is active. The switching channel alias is then used in the mode just like a regular channel. Note that a channel which defines switching channels needs an explicit `defaultValue` to make sure that the switching channel default is also well-defined.

See the [Futurelight PRO Slim PAR-7 HCL fixture](../fixtures/futurelight/pro-slim-par-7-hcl.json) for a simple application example.


### Matrices

Some fixtures have multiple light beams: A horizontal bar of LEDs, a pixel head with a grid of lamps, a fixture consisting of inner and outer rings of LEDs that can be controlled separately, etc. See the [Eurolite LED KLS 801](../fixtures/eurolite/led-kls-801.json) and the "Matrix" category for example fixtures.

#### Matrix structure

The information how these pixels are arranged is stored in the fixture's `matrix` object: Either by using the x × y × z syntax from `pixelCount` (e.g. [5, 5, 1] for a 5×5 matrix) or by naming each individual pixel in `pixelKeys`, e.g.:

```js
"matrix": {
  "pixelKeys": [
    [
      [ null,  "Top",     null  ],
      ["Left", "Center", "Right"],
      [ null,  "Bottom",  null  ]
    ]
  ]
}
```

`null` refers to a "hole", i.e. there's no light beam, which allows for non-cubic frames. The above example represents 5 heads arranged like a "+".

Pixels can also be grouped if a fixture allows control in different fine grades, like fourths or halfs of a light bar:

```js
"matrix": {
  "pixelKeys": [
    [
      ["1/4", "2/4", "3/4", "4/4"]
    ]
  ],
  "pixelGroups": {
    "1/2": ["1/4", "2/4"],
    "2/2": ["3/4", "4/4"]
  }
}
```

Pixel groups can also be used to better describe the pixel structure, for example to define circular rings consisting of virtual pixels, even if these pixels don't physically exist and only the whole rings can be controlled.

```js
"matrix": {
  "pixelKeys": [
    [
      [null,  null,  "O1",  "O2",  null,  null],
      [null,  "O3",  "M1",  "M2",  "O4",  null],
      ["O5",  "M3",  "I1",  "I2",  "M4",  "O6"],
      ["O7",  "M5",  "I3",  "I4",  "M6",  "O8"],
      [null,  "O9",  "M7",  "M8",  "O10", null],
      [null,  null,  "O11", "O12", null,  null]
    ]
  ],
  "pixelGroups": {
    "Inner ring":  ["I1", "I2", "I3", "I4"],
    "Middle ring": ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"],
    "Outer ring":  ["O1", "O2", "O3", "O4", "O5", "O6", "O7", "O8", "O9", "O10", "O11", "O12"]
  }
}
```

#### Template channels

To reuse similar channels for each pixel or pixel group (like "Red&nbsp;1", Red&nbsp;2", ...), add template channels: They are specified very similar to normal available channels, except that each template channel key / alias / name must contain the `$pixelKey` variable:

```js
"templateChannels": {
  "Red $pixelKey": {
    "type": "Single Color",
    "color": "Red",
    "fineChannelAliases": ["Red $pixelkey fine"]
  }
}
```

Template channels can also introduce fine and switching channels. Specific resolved matrix channels can be overriden by available channels (e.g. if "Speed&nbsp;1" has different capabilities than "Speed&nbsp;2" until "Speed&nbsp;25"). See the [cameo Hydrabeam 300 RGBW](../fixtures/cameo/hydrambeam-300-rgbw.json) that uses these features.

Then, either use the resolved channel keys directly in a mode's channel list, or use a matrix channel insert block that repeats a list of template channels for a list of pixels:

```js
{
  "name": "14-channel",
  "shortName": "14ch",
  "channels": [
    "Master Dimmer",
    "Strobe",
    {
      "insert": "matrixChannels", // static value for matrix channels
      "repeatFor": "eachPixelXYZ", // see below
      "channelOrder": "perPixel", // or "perChannel"
      "templateChannels": [
        "Red $pixelKey",
        "Green $pixelKey",
        "Blue $pixelKey"
      ]
    }
  ]
}
```

`repeatFor` defines in which order and for which pixels / pixel groups the template channels shall be repeated. Possible values are:

* An array of pixel (group) keys in the proper order
* `"eachPixelABC"`: Gets computed into an alphanumerically sorted list of all pixelKeys
* `"eachPixelXYZ"` / `"eachPixelZYX"` / ...: Gets computed into a list of all pixelKeys, sorted by position, depending on the used `X`/`Y`/`Z` combination.
  - For example, `XYZ` orders the pixels like reading a book (latin script): First left-to-right (`X`, letter by letter), then top-to-bottom (`Y`, line by line), then front-to-back (`Z`, page by page). For a 3-dimensional 2×2×2 matrix, this results in `["(1, 1, 1)", "(2, 1, 1)", "(1, 2, 1)", "(2, 2, 1)", "(1, 1, 2)", "(2, 1, 2)", "(1, 2, 2)", "(2, 2, 2)]"`.
* `"eachPixelGroup"`: Gets computed into an array of all pixel group keys, ordered by appearance in the JSON file.
  - For the above [matrix structure](#matrix-structure) example, this results in `["Inner ring", "Middle ring", "Outer ring"]`.



### RDM (Remote Device Management) data

We link to [Open Lighting's RDM database](http://rdm.openlighting.org) if possible. Thus, we need to specify the RDM manufacturer ID per manufacturer and the RDM model ID per fixture. Additionally, each mode is mapped to the respective RDM personality via the `rdmPersonalityIndex` property. To ensure compatibility, we also track, for which RDM fixture software (firmware) version the mode indices are specified.

If RDM manufacturer and model ID are known, we open the respective fixture page when going to `/rdm` (handled in [`main.js`](../main.js) and `views/pages/rdm-*.js`).