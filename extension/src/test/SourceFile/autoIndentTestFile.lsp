(defun c:indentTest (/ a b)
  (setq a 3)
  (setq b 
      "test")
  (princ a)
      (princ b)
      (setq lst (reverse 
            (mapcar 
              '(lambda (a b) 
                 (cons (car a) (cons 42 (- (cddr b))))
               )
              lst
              (cons (last lst) lst)
            )
          )
)
(while (< i iNumObjects)
    (repeat m
      (setq lname (car objecttypes))
    ))
  
    (foreach x lst
    (if (nth 3 x)
      (foreach n (nth 3 x)
        (if (not (member n wlst))
          (progn
          (setq wlst1 (cons 1 wlst))
          (setq wlst2 (cons 2 wlst))
        )
      )
    )
  ))
;;This is a test for cond and comment
  (cond
    ((= typ "sphere") (princ "\nSpecify radius of sphere or [Diameter]: "))
    ((= typ "dome"  ) (princ "\nSpecify radius of dome or [Diameter]: "))
    ((= typ "dish"  ) (princ "\nSpecify radius of dish or [Diameter]: "))
  )
  ;| 
     This is a block comments test
     
     |;
) 
()
;| 
This is a block comments test for the end of the doc
|;
(setq a '(1))
(setq a 3
      b 5
)
		(setq a 	"use tab key"
			  b		"use tab key"
        )
(defun foo)
(defun foo (/ a b))
(defun foo (a
            b))
