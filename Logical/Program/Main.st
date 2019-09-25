
PROGRAM _INIT
	(* Insert code here *)
	 
END_PROGRAM


PROGRAM _CYCLIC

	IF test1calvar THEN
		TransformString	:= '[{"select":"#path","duration":1000,"display":true,spin":[45,0,0]}]';
	ELSE
		TransformString	:= '';
	END_IF;

END_PROGRAM


PROGRAM _EXIT
	(* Insert code here *)
	 
END_PROGRAM

