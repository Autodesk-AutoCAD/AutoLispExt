;-------------------------------------------------------
;   This document is property of SomeFakeCopany LLC    |
;-------------------------------------------------------
;    To comply with company standards load this into   |
;      AutoCAD when annotating modelspace drawings     |
;-------------------------------------------------------

(LoadGlobalVariables)

; Use this command to create all modelspace text
(defun C:CText ()
  (settextstyle sfc:style2)
  (command ".text")
)

; Add Standard Dimension, use this to create all modelspace dimensions
(defun C:ASD ()
  (setDimStyle sfc:style3)
  (command ".dimlinear")
)

