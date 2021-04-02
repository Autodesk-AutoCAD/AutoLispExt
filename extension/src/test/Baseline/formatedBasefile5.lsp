(defun format_bug_test (/ *error* cen dpr ent lst ocs ofe off tmp 
                        vpe vpt
                       ) 

  (defun *error* (msg) 
    (if (not (wcmatch (strcase msg t) "*break,*cancel*,*exit*") ) 
      (princ (strcat "\nError: " msg))
    )
    (princ)
  )
)
