package generalunion

import (
	"testing"
)

func TestMetalDeserializationAlloy(t *testing.T) {
	data := []byte(`{"name":"bronze","percentage":0.5}`)
	metal, err := UnmarshalMetal(data)
	if err != nil {
		t.Fatalf("UnmarshalMetal failed: %v", err)
	}

	if metal.Type() != "Alloy" {
		t.Errorf("Expected type to be 'Alloy' but got %s", metal.Type())
	}

	switch e := metal.(type) {
	case MetalAlloy:
		if e.Value.Name != "bronze" {
			t.Errorf("Expected name to be 'bronze' but got %s", e.Value.Name)
		}
		if e.Value.Percentage != 0.5 {
			t.Errorf("Expected percentage to be 0.5 but got %f", e.Value.Percentage)
		}
	case MetalMetalStringValues:
		t.Errorf("Expected type to be 'Alloy' but got %s", e.Type())
	}
}

func TestMetalDeserializationString(t *testing.T) {
	data := []byte(`"iron"`)
	metal, err := UnmarshalMetal(data)
	if err != nil {
		t.Fatalf("UnmarshalMetal failed: %v", err)
	}

	if metal.Type() != "MetalStringValues" {
		t.Errorf("Expected type to be 'MetalStringValues' but got %s", metal.Type())
	}

	switch e := metal.(type) {
	case MetalAlloy:
		t.Errorf("Expected type to be 'MetalStringValues' but got %s", e.Type())
	case MetalMetalStringValues:
		if e.Value != "iron" {
			t.Errorf("Expected name to be 'iron' but got %s", e.Value)
		}
	}
}
