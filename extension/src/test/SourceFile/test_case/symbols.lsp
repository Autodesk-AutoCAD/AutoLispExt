


;|
  this is a passive short description
  @Returns Real
  @Description this is redundant
  @Remarks this is some random additional information
           and some more non-information to simulate multi-line
  @Param nil this is a bogus parameter
  @Param T
  @Global this function will be exported because its documentation contains the global flag
|;
(defun C:whatever (/ a b GV:Field0)
  (setq GV:Field0 0  ; @Global this will not be an exported global because it was localized
        GV:Field1 42 ; @Global this will be an exported global because it is same-line-tagged and not localized
        a 24
        c 37
  )
  (* a GV:Field1)
)

; @Global this function will be exported because it is exported by using the global flag
(defun C:StuffAndThings ()
  (command "regen")
)

(defun C:Stuff&Things () ; @Global this function will be exported because it was same-line-tagged as global
  (command "regen")
)

(defun C:DoStuff () ; this function will not be exported because it was not exported using the global flag
  (command "regen")
)

; @Global this will export 2 variables because the whole of setq was tagged and not localized
(setq GV:Field2 "I am exported"
      GV:Field3 "Should inherit export"
)

(setq GV:Field4 "Some exported value" ; @Global
      GV:Field5 "Should not inherit export"
)

GV:Field2

; keep this at the end of the file
(setq qList1 '(1 2 3) ; @Global
      qList2 '('(NIL) 2 3))