(defun c:formatTest (/ *error* a b  cen dpr ent lst ocs ofe off tmp 
                        vpe vpt) 
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
)
