'use strict';
window.PX = window.PX || {};

const $ = id => document.getElementById(id);

PX.dom = {
  // Contrôles
  algoSelect:     $('algo-select'),
  btnBW:          $('btn-bw'),
  btnColor:       $('btn-color'),
  alphaRow:       $('alpha-row'),
  alphaCheck:     $('alpha-check'),
  linesDirGroup:  $('lines-dir-group'),
  dirH:           $('dir-h'),
  dirV:           $('dir-v'),
  sizeSlider:     $('size-slider'),
  sizeVal:        $('size-val'),
  thresholdGroup: $('threshold-group'),
  thresholdSlider:$('threshold-slider'),
  thresholdVal:   $('threshold-val'),
  ditherGroup:    $('dither-group'),
  distortionGroup:$('distortion-group'),
  distortionSlider:$('distortion-slider'),
  distortionVal:  $('distortion-val'),
  ditherSlider:   $('dither-slider'),
  ditherVal:      $('dither-val'),
  paletteGroup:   $('palette-group'),
  paletteList:    $('palette-list'),
  palAdd:         $('pal-add'),

  // Bas de colonne
  trashBtn:       $('trash-btn'),
  exportBtn:      $('export-btn'),

  // Preview
  previewArea:    $('preview-area'),
  previewCanvas:  $('preview-canvas'),
  dropZone:       $('drop-zone'),
  processing:     $('processing'),
  sourceVideo:    $('source-video'),

  // Contrôles vidéo
  videoControls:  $('video-controls'),
  playPauseBtn:   $('play-pause-btn'),
  videoTrack:     $('video-track'),
  videoFill:      $('video-fill'),
  videoTime:      $('video-time'),

  // Thème + liens
  themeBright:    $('theme-bright'),
  themeDark:      $('theme-dark'),
  igBtn:          $('ig-btn'),

  // Modales
  pickerOverlay:  $('picker-overlay'),
  spectrumCanvas: $('spectrum-canvas'),
  brightnessCanvas: $('brightness-canvas'),
  colorPreview:   $('color-preview'),
  hexInput:       $('hex-input'),
  pickerCancel:   $('picker-cancel'),
  pickerApply:    $('picker-apply'),

  confirmOverlay: $('confirm-overlay'),
  confirmYes:     $('confirm-yes'),
  confirmNo:      $('confirm-no'),

  progressOverlay:$('progress-overlay'),
  progressLabel:  $('progress-label'),
  progressFill:   $('progress-fill')
};
