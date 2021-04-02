;;Test unicode
(defun unicode_test ( / chs 中文 €℃£¥)
  (setq chs '("中文" "测试")
        en '("English" "test")
        jp '("ㇰㇵㇺㇿ" "私はガラス")
        chs_tw '("不傷身體" "test")
        ger '("nët" "syvvä")
        Russ '("стекло" "оно вредит")
        fin '("I kå frässa" "test")
        greek '("Μπορώ να φάω" "test")
        Korea '("나는 유리를" "test")
  
  )
  (setq funList '("read" "strcase" "strcat" "strlen" "substr" "subst" 
            "wcmatch" "setq" "layer" "style" "dimstyle" "leader" 
            "mtext" "text" "block" "attdef" "layout" "chru" "asciiu" 
            "vl_file_copy" "vl_prin1_to_string" "vl_princ_to_string" 
            "vl_string_translate" "vl_string_eltu" "vl_string_left_trim" 
            "vl_string_mismatch" "vl_string_positionu" 
           "vl_string_right_trim" "vl_string_search" 
           "vl_string_subst" "vl_string_trim" 
            "read_char" "read_line" "write_char" 
            "write_line" "vl_file_delete" 
            "vl_filename_base" "vl_filename_directory" "vl_filename_extension" 
            "vl_load_all" "load" "vl_mkdir")
  
        uniCharFolderList '("English" "€℃£¥" "⅛¾²" "ㇰㇵㇺㇿ" "中文" "不傷身體" "私はガラス" 
                     "nët" "syvvä" "стекло" "أنا قادر
                            على أكل" "оно вредит" 
                     "Μπορώ να φάω" "Ich kann" "I kå frässa" "ça ne me" "나는 유리를")
        CIF "\\\\U+4E2D\\\\U+6587"
        MIF "\\\\M+18260\\\\M+18282\\\\
        M+18251\\\\M+1834B\\\\M+18C5C"
  )
)
(unicode_test)