; random sample file


;|
  Completely useless function specifically for testing
  @Param x your guess is as good as mine
  @Param y probably just a random letter
  @Returns nil
|;
(defun sampleFunc (x y / a b c d)
  (setq a (list 1 2 3 4) ; does this screw it all up?
        d (setq b 0)
        b (mapcar '+ a))
  (foreach x a
    (setq d (1+ d))
  )


  ;|
    I set a variable
    @Returns 32
  |;
  (defun SymPtrOnly ()
    (setq gv 32)
  )


  ;|
    I have a useless child
    @Param a IDK we don't do anything at all with a except pass it
    along to the q function
    @Param b not too sure on this one either
    this is also passed along
    pretty sure all this nonsense just multiplies 2 number together
    @Null means nothing
    @Returns real number
  |;
  (defun c (a b / q)
    ;|
      @Description Useless as can be
      @Param r
      @Param j
      @Returns real number
      @Remarks some random additional info
    |;
    (defun q (r j / z)
      (setq z (* r j))
    )

    (q a b)
  )
)


(setq some "random"     ; does this trip?
      global (list "variables" "to" "test")
      with (vl-sort '(lambda(a b) (setq c (< a b))) global)
)

(foreach rando global
  (setq some (strcat some " " rando))
)

(setq gv:field1 99) ; @Global
