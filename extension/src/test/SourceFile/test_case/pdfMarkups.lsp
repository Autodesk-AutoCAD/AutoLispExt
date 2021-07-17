; random sample file

(defun sampleFunc (x y / a b c d)
  (setq a (list 1 2 3 4) ; does this screw it all up?
        d (setq b 0)
        b (mapcar '+ a))
  (foreach x a
    (setq d (1+ d))
  )
  
  (defun SymPtrOnly ()
    (setq gv 32)
  )
  
  (defun c (a b / q)
    (defun q (r j / z)
      (setq z (* r j))
    )
    
    (q a b)
  )
)


(setq some "random"     ; @Global does this trip?
      global (list "variables" "to" "test")
      with (vl-sort '(lambda(a b) (setq c (< a b))) global)
)

(foreach rando global
  (setq some (strcat some " " rando))
)



(defun DumpPidMarkups (/ path pdfList pdfMarkups lineList compList equpList chckList textList resp contractDrawings downloadPdfs downloadPath badFiles noMarkups)
  
  (defun collectMarkups ( file / pchckList pcompList pequpList plineList ptextList markups fixAnno ret )
    (setq ret nil)
    (if (not (vl-catch-all-error-p (setq markups (vl-catch-all-apply 'NS:XfiniumPDF:GetAnnotations (list file 1))))) ; Hard code page 1
      (if (> (length markups) 0)
        (progn
          (setq markups (vl-remove-if '(lambda (a) (or (/= (type a) 'LIST) (/= (strcase (nth 3 a)) "FREETEXT") (null (nth 5 a)) (= (nth 5 a) ""))) markups))
          (setq markups (mapcar '(lambda (a) (list (vl-filename-base file) (nth 4 a) (nth 5 a) (nth 6 a))) markups))
          (if (> (length markups) 0)
            (progn
              (foreach anno markups
                (setq fixAnno (mapcar '(lambda (l) (if (= (type l) 'STR) (acet-str-replace "\r" "-" (vl-string-trim " " (vl-string-trim (chr 9) l))) l)) anno))
                (cond
                  ((vl-string-search "LINENUMBER" (strcase (nth 1 fixAnno)))
                   (setq plineList (cons fixAnno plineList)))
                  ((vl-string-search "COMPONENT" (strcase (nth 1 fixAnno)))
                   (setq pcompList (cons fixAnno pcompList)))
                  ((vl-string-search "EQUIPMENT" (strcase (nth 1 fixAnno)))
                   (setq pequpList (cons fixAnno pequpList)))
                  ((and (null (vl-string-search "NOT IN SCOPE" (nth 2 fixAnno)))(>= (- (strlen (nth 2 fixAnno)) (strlen (acet-str-replace "-" "" (nth 2 fixAnno)))) 3))
                   (setq pchckList (cons fixAnno pchckList)))
                  (t
                   (setq ptextList (cons fixAnno ptextList)))
                  )
                )
              (setq ret (list plineList pcompList pequpList pchckList ptextList))
              )
            )
          )
        )
      (setq ret (vl-filename-base file))
      )
    ret
    )

  (defun getPdfList ( pth / retList )
    (setq retList (cadr (NS:ACAD:FilePicker "Select P&IDs to export markups" "Select files" GV:ProjPath "*.pdf")))
    (cond
      ((null retList) (exit))
      ((and (vl-consp retList) (= (length retList) 1) (= (car retList) ""))
       (setq retList getPdfList))
      ((and (vl-consp retList) (> (length retList) 1) (vl-every 'findfile retList))
       (terpri)
       (prompt (strcat (itoa (length retList)) " PDFs selected for processing")))
      )
    retList
    )
       

  (if (null GV:ProjIni) (progn (NS:ACAD:MessageBox *GV:ProjIni* "Project.ini error" 0 16)(exit)))

  (setq resp (car (NS:ACAD:MessageBox "Do you want to download drawings?" "P&ID Download and Export" 3 32)))
  (cond    
    ((= resp 2) ; Cancel
     (terpri)
     (prompt "P&ID Markup Export Terminated")
     (exit)
     )
    ((= resp 6) ; Yes
     (setq contractDrawings (vl-catch-all-apply 'NS:Sharepoint:Read (list t GV:ExePath GV:ProjUrl "Contract Drawings" "ID" "Name")))
     (if (vl-catch-all-error-p contractDrawings) (progn (alert "Error reading from Sharepoint") (exit)))
     (setq contractDrawings (vl-remove-if '(lambda (d) (null (vl-string-search ".pdf" (car d)))) (mapcar 'reverse contractDrawings))
           downloadPdfs (cadr (NS:ACAD:ListBox "Select PDFs to Download" "Download Drawings" (acad_strlsort (mapcar 'car contractDrawings)) t)))
     (if (null downloadPdfs) (exit))
     (setq downloadPath (caadr (NS:ACAD:DirPicker "Select Download Path" "Download files" GV:ProjPath)))
     (if (null downloadPath) (exit))
     (foreach pdf downloadPdfs
       (setq downloadIds (cons (cadr (assoc pdf contractDrawings)) downloadIds))
       )
     (NS:SharePoint:Download GV:ExePath (cadr(assoc "SITE" GV:ProjIni)) "Contract Drawings" "ID" (mapcar 'itoa downloadIds) downloadPath)
     (setq defaultPath downloadPath)
     )
    ((= resp 7) ; No
     (setq defaultPath GV:ProjPath))
    )
  (setq pdfList (getPdfList defaultPath))
  (if (and pdfList (> (length pdfList) 0))
    (foreach pdf pdfList
      (setq pdfMarkups (collectMarkups pdf))
      (cond
        ((null pdfMarkups)
         (setq noMarkups (cons (vl-filename-base pdf) noMarkups)))
        ((= (type pdfMarkups) 'STR)
         (setq badFiles (cons pdfMarkups badFiles)))
        ((listp pdfMarkups)
         (if (nth 0 pdfMarkups)
           (setq lineList (append (nth 0 pdfMarkups) lineList)))
         (if (nth 1 pdfMarkups)
           (setq compList (append (nth 1 pdfMarkups) compList)))
         (if (nth 2 pdfMarkups)
           (setq equpList (append (nth 2 pdfMarkups) equpList)))
         (if (nth 3 pdfMarkups)
           (setq chckList (append (nth 3 pdfMarkups) chckList)))
         (if (nth 4 pdfMarkups)
           (setq textList (append (nth 4 pdfMarkups) textList))))
        )
      )
    )
  (if lineList (IO:WriteLines (cons (list "Page" "Subject" "LineTag" "Author") lineList) (strcat (vl-filename-directory (car pdfList)) "\\Linenumber List.csv")))
  (if compList (IO:WriteLines (cons (list "Page" "Subject" "ComponentTag" "Author") compList) (strcat (vl-filename-directory (car pdfList)) "\\Components List.csv")))
  (if equpList (IO:WriteLines (cons (list "Page" "Subject" "EquipmentTag" "Author") equpList) (strcat (vl-filename-directory (car pdfList)) "\\Equipment List.csv")))
  (if chckList (IO:WriteLines (cons (list "Page" "Subject" "Contents" "Author") chckList) (strcat (vl-filename-directory (car pdfList)) "\\Review Required List.csv")))
  (if textList (IO:WriteLines (cons (list "Page" "Subject" "Contents" "Author") textList) (strcat (vl-filename-directory (car pdfList)) "\\FreeText List.csv")))
  (if badFiles (NS:ACAD:ListBox "Error reading the following files" "File Errors" (acad_strlsort badFiles) t))
  (if noMarkups (NS:ACAD:ListBox "There were no markups on the following files" "No markups" (acad_strlsort noMarkups) t))
  (terpri)
  (prompt "P&ID Markup Export Complete")
  (princ)
  )


(defun doStuff (pth / retList) 
  (setq retList (cadr (NS:ACAD:FilePicker "Select P&IDs to export markups" "Select files" GV:ProjPath "*.pdf" )))
  (cond 
    ((null retList) (exit))
    ((and (vl-consp retList) (= (length retList) 1) (= (car retList) ""))
     (setq retList getPdfList)
    )
    ((and (vl-consp retList) (> (length retList) 1) (vl-every 'findfile retList))
     (terpri)
     (prompt (strcat (itoa (length retList)) " PDFs selected for processing"))
    )
  )
  retList
)

