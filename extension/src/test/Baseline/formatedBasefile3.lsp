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
