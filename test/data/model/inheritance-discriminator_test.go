package modeltest

import (
	"encoding/json"
	"testing"
)

func TestInheritanceDiscriminatorSerialization(t *testing.T) {
	box := PolarBear{Size: "large"}

	data, err := json.Marshal(box)
	if err != nil {
		t.Fatalf("Failed to marshal: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal serialized: %v", err)
	}

	if result["type"] != "polar" {
		t.Errorf("Expected type to be 'polar' but got %v", result["type"])
	}
	if result["size"] != "large" {
		t.Errorf("Expected size to be 'large' but got %v", result["size"])
	}
}

func TestInheritanceDiscriminatorDeserializationFirstVariant(t *testing.T) {
	data := []byte(`{"type":"polar","size":"large"}`)

	bear, err := UnmarshalBox(data)
	if err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	switch e := bear.(type) {
	case PolarBear:
		if e.Type() != "polar" {
			t.Errorf("Expected type to be 'polar' but got %s", e.Type())
		}
	case GrizzlyBear:
		t.Errorf("Expected type to be 'polar' but got %s", e.Type())
	}
}

func TestInheritanceDiscriminatorDeserializationSecondVariant(t *testing.T) {
	data := []byte(`{"type":"grizzly","size":"also_large"}`)

	bear, err := UnmarshalBox(data)
	if err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	switch e := bear.(type) {
	case PolarBear:
		t.Errorf("Expected type to be 'grizzly' but got %s", e.Type())
	case GrizzlyBear:
		if e.Type() != "grizzly" {
			t.Errorf("Expected type to be 'grizzly' but got %s", e.Type())
		}
	}
}
