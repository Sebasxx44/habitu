package main

import "testing"

func TestSafeCellNeutralizesSpreadsheetFormulas(t *testing.T) {
	for _, value := range []string{"=1+1", "+573001234567", "@SUM(A1)", "-2+3", "  =HYPERLINK(\"url\")", "\t=1", "line\n=1"} {
		if safeCell(value) != "'"+value {
			t.Errorf("unsafe cell: %q", value)
		}
	}
	for _, value := range []string{"María Pérez", "Corte, lavado", "Normal", ""} {
		if safeCell(value) != value {
			t.Errorf("changed safe value: %q", value)
		}
	}
}

func TestReportIDRejectsPathsAndInvalidIDs(t *testing.T) {
	for _, value := range []string{"../../etc/passwd", "123", "00000000-0000-0000-0000-000000000000/file"} {
		if validReportID.MatchString(value) {
			t.Fatalf("accepted unsafe ID %q", value)
		}
	}
	if !validReportID.MatchString("54eb25a1-1a8b-47e9-851c-1a94bd8f3d5c") {
		t.Fatal("rejected valid ID")
	}
}
