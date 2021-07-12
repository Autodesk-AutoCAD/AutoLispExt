;-------------------------------------------------------
;   This document is property of SomeFakeCopany LLC    |
;-------------------------------------------------------
;    To comply with company standards load this into   |
;      AutoCAD when annotating paperspace drawings     |
;-------------------------------------------------------

(LoadGlobalVariables)

; Use this command for all Title Block text
(defun C:TText ()
  (setTextStyle sfc:style1)
  (command ".text")
)

; Use this command for all Content text
(defun C:CText ()
  (settextstyle sfc:style2)
  (command ".text")
)

; Add Standard Dimension, use this to create all paperspace dimensions
(defun C:ASD ()
  (setDimStyle sfc:style4)
  (command ".dimlinear")
)
