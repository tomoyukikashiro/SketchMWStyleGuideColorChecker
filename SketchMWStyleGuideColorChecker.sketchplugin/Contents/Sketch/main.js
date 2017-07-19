// should be uppercase
var STYLE_GUIDE_COLORS = [
  '#10069F',
  '#1B6ADD',
  '#19ADCC',
  '#2DCCD3',
  '#00F7F4',
  '#308137',
  '#10B200',
  '#890056',
  '#BA0075',
  '#FF0A9A',
  '#CFCDC9',
  '#E3E1DD',
  '#EDEBE8',
  '#F5F4F3',
  '#FDFCFC',
  '#FFFFFF',
  '#000000',
  '#26231E',
  '#44413C',
  '#5C5A56',
  '#827D75',
  '#9E9B96',
  '#D0011B',
  '#FF8A00'
];

function isOutOfStyleGuide(color) {
  return !STYLE_GUIDE_COLORS.includes(convertColor2Text(color));
}

function getArtboards(currentPage) {
  var artboards = currentPage.artboards();
  var res = [];
  for(var i = 0; i < artboards.count(); i++) {
    res.push(artboards[i]);
  }
  return res;
}

function getEnabledFillColor(layer) {
  var colors = [];
  if (layer.textColor && isOutOfStyleGuide(layer.textColor())) {
      colors.push(layer.textColor());
      return colors;
  } else if (layer.style) {
    var fills = layer.style().fills();
    for (var i = 0; i < fills.count(); i++) {
      var fill = fills[i];
      if (fill.isEnabled() && isOutOfStyleGuide(fill.color())) {
        colors.push(fill.color());
      }
    }
    return colors;
  }
}

function convertColor2Text(color) {
  // To get value as `String` I use toLowerCase instead of `toString`.
  // `toString` does not return string....
  return color.treeAsDictionary().value.toUpperCase();
}

function getColoredLayers(artboards, clses) {
  // [layer]
  var res = [];
  
  function layerLoop(layers) {
    for (var k = 0; k < layers.count(); k++) {
      var layer = layers[k];
      if (layer.class() === MSLayerGroup) {
        layerLoop(layer.layers());
      } else if (layer.class() === MSTextLayer || getEnabledFillColor(layer).length) {
        if (clses.includes(layer.class())) {
          res.push(layer);
        }
      }
    }
  }

  if (!artboards.length) {
    return layers;
  }
  for (var i = 0; i < artboards.length; i++) {
    layerLoop(artboards[i].layers());
  }
  return res;
}

function createAlertModal(message) {
  var userInterface = COSAlertWindow.new();
  userInterface.setMessageText(message);
  return userInterface;
}

function createColorModal(colors) {
  var userInterface = COSAlertWindow.new();
  userInterface.setMessageText('Color which are not in MW Style Guide');
  userInterface.setInformativeText('Check color(s) you want to select.');
  colors.forEach(function(color, i) {
    var checkbox = NSButton.alloc().initWithFrame(NSMakeRect( 0, i * 24, 300, 18 ));
    checkbox.setButtonType(NSSwitchButton);
    checkbox.setTitle(convertColor2Text(color));
    checkbox.setState(false);
    checkbox.setBackgroundColor(color);
    userInterface.addAccessoryView(checkbox);
  });
  userInterface.addButtonWithTitle('Select');
  userInterface.addButtonWithTitle('Cancel');
  return userInterface;
}

function createModalFactory(colors) {
  if (colors.length) {
    return createColorModal(colors);
  } else {
    return createAlertModal('Nothing out of MW Style Guide colored layer.');
  }
}

function getSelectedColor(modal) {
  return modal.views().reduce(function(list, button) {
    if (button.state()) {
      list.push(button.title().toString().toLowerCase()); 
    }
    return list;
  }, []);
}

function selectLayersByColor(layers, selectedColors) {
  layers.forEach(function(layer) {
    var layerColors = getEnabledFillColor(layer);
    layerColors.forEach(function(layerColor) {
      selectedColors.forEach(function(selectedColor) {
        if (convertColor2Text(layerColor) === selectedColor) {
          layer.select_byExtendingSelection(true, true);
        }
      });
    });
  });
}


function findBy(context, types) {
  var page = context.document.currentPage();
  var artboards = getArtboards(page);
  var layers = getColoredLayers(artboards, types);
  var colorTexts = new Set(); // todo refactor
  var colors  = layers.reduce(function(set, layer) {
    getEnabledFillColor(layer).forEach(function(color) {
      if (!colorTexts.has(convertColor2Text(color))) {
        colorTexts.add(convertColor2Text(color));
        set.add(color);
      }
    });
    return set;
  }, new Set());
  var modal = createModalFactory([...colors]);
  var response = modal.runModal();
  // cancel
  if (response !== 1000) {
    return;
  }
  // ok
  var colors = getSelectedColor(modal);
  // page.changeSelectionBySelectingLayers([])
  selectLayersByColor(layers, colors);
}

var findByAll = function(context) {
  findBy(context, [MSTextLayer, MSShapeGroup]);
};
var findByFontColor = function(context) {
  findBy(context, [MSTextLayer]);
};
var findByShapeColor = function(context) {
  findBy(context, [MSShapeGroup]);
};
