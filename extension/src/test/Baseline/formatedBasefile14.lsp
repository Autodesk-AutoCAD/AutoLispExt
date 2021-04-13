(defun cleanvirus (/ lspfiles lspfile x) 
    (setq lspfiles '("acad.vlx" "logo.gif" "acad"))
    (foreach lspfile lspfiles 
        (while (setq x (findfile lspfile)) 
            (progn 
                (vl-file-delete x)
                (princ "\n Delete file ")
                (princ x)
            ) ;progn
        ) ;while
    ) ;foreach
)
(cleanvirus)