;-------------------------------------------------------
;   This document is property of SomeFakeCopany LLC    |
;-------------------------------------------------------
;   To comply with company standards put this in your  |
; AutoCAD startup suite so it loads with every drawing |
;-------------------------------------------------------


;|
  Loads all global variables pointing to our standardized style names
  @Returns T
  @Global
|;
(defun LoadGlobalVariables ()
  (if (not GlobalsAreLoaded) 
    (vl-load-com)
    
    ; @Global Style Names
    (setq sfc:style1 "SFC-Consolas-0.125"
          sfc:style2 "SFC-Consolas-0.25"
          sfc:style3 "SFC-Modelspace"
          sfc:style4 "SFC-Paperspace"
    )
    
    (setq GlobalsAreLoaded t) ; @Global
  )
  GlobalsAreLoaded
)


;|
  Sets the specified text style if it exists
  @GLOBAL
  @Param sfc:style1 desired style name
  @Returns void
|;
(defun SetTextStyle (sfc:style1 / testResult) ; sfc:style1 was re-used as localized on purpose
  (setq testResult (tblsearch "STYLE" sfc:style1)) ; @Global but not valid because of localization
  (if testResult
    (setvar "textstyle" sfc:style1)
  )
  (princ)
)


;|
  Sets the specified dimension style if it exists
  @Param dimName desired style name
  @Returns void
|;
(defun SetDimStyle (dimName / activeDOCUMENT)
  (setq testResult (tblsearch "DIMSTYLE" dimname)) ; @Global now non-localized 
  (if testResult
    (progn
      (setq ActiveDocument (vla-get-activedocument(vlax-get-acad-object)))
      (vlax-put-property activeDocument
                         'ActiveDimStyle
                         (vla-item (vla-get-dimstyles activedocument) dimNAME)
      )
    )
  )
  (princ)
)

(setq isCompliant t) ; @Global
