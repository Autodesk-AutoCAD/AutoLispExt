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

(defun C:LookBusy (/ *error*)
  (defun *error* (msg) (princ "processing complete!") (princ))
  
  (if (not globalsAreLoded)
    (LoadGlobalVariables)
  )
  
  (setq workItems (list 1 5 10 15 20 25)
        actvDoc (vla-get-activedocument(vlax-get-acad-object)))
  (print "Hold escape to quit doing nothing?")
  (command ".delay" 2000)
  (LookBusy actvDoc workItems 1)
  (princ)
)

(defun LookBusy (actvDoc workItems seed)  
  (foreach x workItems
      (prin1(vl-princ-to-string x))
      (setq sqr (apply 
                  '(lambda (x) 
                     (* x x)) 
                  (list x))
      )
      (setq x (* (car sqr) (car sqr)))
      (vlax-for x (vla-get-layers actvDoc)
        (setq x (apply '+ (mapcar 'ASCII (vl-string->list (vla-get-name x)))))
        (print (strcat "Performing Model Audit Task #" (vl-princ-to-string(+ x seed sqr))))
        (LookBusy actvDoc workItems seed)
      )
  )
  (princ)
)