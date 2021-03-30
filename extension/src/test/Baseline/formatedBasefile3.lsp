(defun c:vpo (/ *error* cen dpr ent lst ocs ofe off tmp vpe vpt) 

  (defun *error* (msg) 
    (LM:endundo (LM:acdoc))
    (if (not (wcmatch (strcase msg t) "*break,*cancel*,*exit*")) 
      (princ (strcat "\nError: " msg))
    )
    (princ)
  )

  (setq  ;;----------------------------------------------------------------------;;
         ;;                          Program Parameters                          ;;
         ;;----------------------------------------------------------------------;;
         ;; Optional Interior Offset
         ;; Set this parameter to nil or 0.0 for no offset
        off 0.0 ;; Default Polyline Properties
         ;; Omitted properties will use current settings when the program is run
        dpr '((006 . "BYLAYER") ;; Linetype (must be loaded)
              ;(008 . "VPOutline") ;; Layer (automatically created if not present in drawing)
              (039 . 0.0) ;; Thickness
              (048 . 1.0) ;; Linetype Scales
              (062 . 256) ;; Colour (0 = ByBlock, 256 = ByLayer)
              (370 . -1) ;; Lineweight (-1 = ByLayer, -2 = ByBlock, -3 = Default, 0.3 = 30 etc.)
             ) ;;----------------------------------------------------------------------;;
  )

  (LM:startundo (LM:acdoc))
  (cond 
    ((/= 1 (getvar 'cvport))
     (princ "\nCommand not available in Modelspace.")
    )
    ((setq vpt (LM:ssget "\nSelect viewport: " '("_+.:E:S" ((0 . "VIEWPORT")))))
     (setq vpt (entget (ssname vpt 0)))
     (if (setq ent (cdr (assoc 340 vpt))) 
       (setq lst (vpo:polyvertices ent))
       (setq cen (mapcar 'list 
                         (cdr (assoc 10 vpt))
                         (list 
                           (/ (cdr (assoc 40 vpt)) 2.0)
                           (/ (cdr (assoc 41 vpt)) 2.0)
                         )
                 )
             lst (mapcar 
                   '(lambda (a) (cons (mapcar 'apply a cen) '(42 . 0.0)))
                   '((- -) (+ -) (+ +) (- +))
                 )
       )
     )
     (if (not (LM:listclockwise-p (mapcar 'car lst))) 
       (setq lst (reverse 
                   (mapcar '(lambda (a b) (cons (car a) (cons 42 (- (cddr b))))) 
                           lst
                           (cons (last lst) lst)
                   )
                 )
       )
     )
     (if (and (numberp off) (not (equal 0.0 off 1e-8))) 
       (cond 
         ((null 
            (setq tmp (entmakex 
                        (append 
                          (list 
                            '(000 . "LWPOLYLINE")
                            '(100 . "AcDbEntity")
                            '(100 . "AcDbPolyline")
                            (cons 90 (length lst))
                            '(070 . 1)
                          )
                          (apply 'append 
                                 (mapcar 
                                   '(lambda (x) (list (cons 10 (car x)) (cdr x)))
                                   lst
                                 )
                          )
                        )
                      )
            )
          )
          (princ "\nUnable to generate Paperspace outline for offset.")
         )
         ((vl-catch-all-error-p 
            (setq ofe (vl-catch-all-apply 'vlax-invoke 
                                          (list (vlax-ename->vla-object tmp) 
                                                'offset
                                                off
                                          )
                      )
            )
          )
          (princ 
            (strcat "\nViewport dimensions too small to offset outline by " 
                    (rtos off)
                    " units."
            )
          )
          (entdel tmp)
         )
         ((setq ofe (vlax-vla-object->ename (car ofe))
                lst (vpo:polyvertices ofe)
          )
          (entdel ofe)
          (entdel tmp)
         )
       )
     )
     (setq vpe (cdr (assoc -1 vpt))
           ocs (cdr (assoc 16 vpt))
     )
     (entmakex 
       (append 
         (list 
           '(000 . "LWPOLYLINE")
           '(100 . "AcDbEntity")
           '(100 . "AcDbPolyline")
           (cons 90 (length lst))
           '(070 . 1)
           '(410 . "Model")
         )
         (if (and (setq ltp (assoc 6 dpr)) (not (tblsearch "ltype" (cdr ltp)))) 
           (progn 
             (princ 
               (strcat "\n\"" 
                       (cdr ltp)
                       "\" linetype not loaded - linetype set to \"ByLayer\"."
               )
             )
             (subst '(6 . "BYLAYER") ltp dpr)
           )
           dpr
         )
         (apply 'append 
                (mapcar 
                  '(lambda (x) 
                     (list (cons 10 (trans (pcs2wcs (car x) vpe) 0 ocs)) (cdr x))
                   )
                  lst
                )
         )
         (list (cons 210 ocs))
       )
     )
    )
  )

  (LM:endundo (LM:acdoc))
  (princ)
)
