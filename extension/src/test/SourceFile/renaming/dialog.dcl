/*
this is a block
comment
*/  // line comment on block tail

ALE_Dialog1 : dialog {
    // do stuff
    label = "Random Choices Box";
    // and things
    initial_focus = "cbxProj1"; // then disappear
    : boxed_row { label = "Select an option:";
        : column { width = 40; children_alignment = right;
            : text { value = "NA"; key = "lblProj3"; }
            : text { value = "NA"; key = "lblProj4"; }
            }
        : column { width = 1; children_alignment = centered; children_fixed_width = true; horizontal_margin = 1;
            : row { horizontal_margin = 0;
                : toggle { action = "(DoCbxStuff \"stringArg\")"; width = 1; key = "cbxProj3"; }
                : spacer { width = 2; }
                : toggle { action = "(DoCbxStuff)"; width = 1; key = "cbxProj1"; }
                }
            : row { horizontal_margin = 0;
                : toggle { action = "(DoCbxStuff)"; width = 1; key = "cbxProj4"; }
                : spacer { width = 2; }
                : toggle { action = "(DoCbxStuff)"; width = 1; key = "cbxProj2"; }
                }
            }
        : column { width = 40; alignment = left; children_fixed_width = false; horizontal_margin = 0; children_alignment = left; horizontal_alignment = left;
            : text { alignment = left; value = "NA"; key = "lblProj1"; }
            : text { alignment = left; value = "NA"; key = "lblProj2"; }
            }
        } //boxed row
    }


ALE_Dialog2 : dialog {
    label = "Other Stuff Dialog";
    : boxed_row {
        label = "Tell me something cool";
        : edit_box { action = "(GoDoStuff)"; key = "tbxInfo"; }
        }
    : row {
        : button { key = "btnCancel"; label = "Cancel"; is_cancel = true; }
        : spacer { width = 60; }
        : button { key = "btnOkay"; label = "Send"; is_enabled = false; }
        }
    spacer;
    ok_cancel;
    }