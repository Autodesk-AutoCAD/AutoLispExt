    (setq

;;----------------------------------------------------------------------;;
;;                          Program Parameters                          ;;
;;----------------------------------------------------------------------;;

        ;; Optional Interior Offset
        ;; Set this parameter to nil or 0.0 for no offset
        off 0.0

        ;; Default Polyline Properties
        ;; Omitted properties will use current settings when the program is run
        dpr
       '(
            (006 . "BYLAYER")   ;; Linetype (must be loaded)
           ;(008 . "VPOutline") ;; Layer (automatically created if not present in drawing)
            (039 . 0.0)         ;; Thickness
            (048 . 1.0)         ;; Linetype Scale
            (062 . 256)         ;; Colour (0 = ByBlock, 256 = ByLayer)
            (370 . -1)          ;; Lineweight (-1 = ByLayer, -2 = ByBlock, -3 = Default, 0.3 = 30 etc.)
        )
        
;;----------------------------------------------------------------------;;

    )
  