
(defun c:flower( / R1 n1 n2 pt1 pt2 pt3 pt4 pt5)
(princ "中文测试")
  (setq lst '("abc" nil nil 1 nil 10 nil 12))
  (setq centerPt0 (getpoint "\n Please pick point in screen")
    R1 5
    R2 (* 2 R1)
    R3 R1
    n1 6      
    n2 12
    2p (* 2 PI)
    ang (/ 360.0 n1)
    ang30 (* PI (/ 30 180.0))
    ang60 (* PI (/ 60 180.0))
    ang120 (* PI (/ 120 180.0))
    ang150 (* PI (/ 150 180.0))
    color 3
    width 5
        
    
  )
	(princ a)
	
  (setq pt1 centerPt0
    pt2 (list (car pt1) (+ (cadr pt1) R1))
    pt3 (polar pt1 ang60 R1 )
    centerPt1 (polar pt1 ang30 R1 )
    centerPt2 (polar pt1 ang120 R1 )
    centerPt3 (polar pt1 ang150 R1 )
    pt4 (polar centerPt2 ang30 R1 )
    pt5 (polar pt2 ang60 R1 )
    
  )
  
  (SETQ ss1 (ssadd))
  (Command "_Arc" pt2 "_C" centerPt1 "_A" 60)
  (ssadd (entlast) ss1)
  (Command "_Arc" pt1 "_C" centerPt3 "_A" 60)
  (ssadd (entlast) ss1)
  (command "_-hatch" "_p" "solid" "_s" ss1 "" "_co" "40" "" "")
  (ssadd (entlast) ss1)
  (command "_array" ss1 "" "_polar" centerPt0 n1 "360" "_y")
  (setq ss1 nil)
  (setq ss1 nil)
  (setq ss1 (ssadd))
  
  (Command "_Arc" pt4 "_C" centerPt1 "_A" 30)
  (ssadd (entlast) ss1)
  (Command "_Arc" pt3 "_C" centerPt2 "_A" 30)
  (ssadd (entlast) ss1)
  (Command "_Arc" pt3 "_C" centerPt0 "_A" 30)
  (ssadd (entlast) ss1)
  
  (command "_-hatch" "_p" "solid" "_s" ss1 "" "_co" "222" "" "")
  (ssadd (entlast) ss1)
  (command "_array" ss1 "" "_polar" centerPt0 n2 "360" "_y")
  
  (setq ss1 nil)
  (setq ss1 (ssadd))
  (Command "_Arc" pt5 "_C" pt2 "_A" 60)
  (ssadd (entlast) ss1)
  
  (command "_array" ss1 "" "_polar" centerPt0 n2 "360" "_y")
  (princ)
  
)