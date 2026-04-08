grammar TaskDSL;

task
    : title priority? duration? tag* EOF
    ;

title
    : (WORD | IN)+
    ;

priority
    : PRIORITY
    ;

duration
    : IN DURATION
    ;

tag
    : TAG
    ;

PRIORITY
    : '@' ('low' | 'medium' | 'high' | 'urgent')
    ;

IN
    : 'in'
    ;

DURATION
    : [0-9]+ [dhw]
    ;

TAG
    : '#' [a-zA-Z\u0080-\uFFFF] [a-zA-Z0-9_\u0080-\uFFFF]*
    ;

WORD
    : ~[ \t\r\n@#]+
    ;

WS
    : [ \t\r\n]+ -> skip
    ;
