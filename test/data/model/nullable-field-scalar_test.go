package modeltest

import (
	"encoding/json"
	"testing"
)

func TestNullableScalarSerializationSetValue(t *testing.T) {
	obj := HasScalarNullable{
		ScalarNullableField: SetNullable("test"),
	}

	data, err := json.Marshal(obj)
	if err != nil {
		t.Fatalf("Failed to marshal HasScalarNullable: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal serialized HasScalarNullable: %v", err)
	}

	if result["scalarNullableField"] != "test" {
		t.Errorf("Expected scalarNullableField to be 'test' but got %v", result["scalarNullableField"])
	}
}

func TestNullableScalarSerializationUnsetValue(t *testing.T) {
	obj := HasScalarNullable{
		ScalarNullableField: UnsetNullable[string](),
	}

	data, err := json.Marshal(obj)
	if err != nil {
		t.Fatalf("Failed to marshal HasScalarNullable: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal serialized HasScalarNullable: %v", err)
	}

	if _, ok := result["scalarNullableField"]; ok {
		t.Error("Expected scalarNullableField to be absent")
	}
}

func TestHasScalarNullableDeserialization(t *testing.T) {
	data := []byte(`{"scalarNullableField":"test"}`)

	var obj HasScalarNullable
	if err := json.Unmarshal(data, &obj); err != nil {
		t.Fatalf("Failed to unmarshal HasScalarNullable: %v", err)
	}

	if !obj.ScalarNullableField.IsSet() {
		t.Error("Expected scalarNullableField to be set")
	}

	if obj.ScalarNullableField.Value() != "test" {
		t.Errorf("Expected scalarNullableField to be 'test' but got %s", obj.ScalarNullableField.Value())
	}
}
