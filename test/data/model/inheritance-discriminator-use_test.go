package modeltest

import (
	"encoding/json"
	"testing"
)

func TestInheritanceDiscriminatorUseSerialization(t *testing.T) {
	storage := Storage{Box: SmallBox{}}

	data, err := json.Marshal(storage)
	if err != nil {
		t.Fatalf("Failed to marshal: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	box := result["box"].(map[string]interface{})
	if box["type"] != "small" {
		t.Errorf("Expected type to be 'small' but got %v", result["type"])
	}
}

func TestInheritanceDiscriminatorUseSerializationFirstVariant(t *testing.T) {
	data := []byte(`{"box":{"type":"small"}}`)

	var storage Storage
	if err := json.Unmarshal(data, &storage); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	switch e := storage.Box.(type) {
	case SmallBox:
		if e.Type() != "small" {
			t.Errorf("Expected type to be 'small' but got %s", e.Type())
		}
	case LargeBox:
		t.Errorf("Expected type to be 'small' but got %s", e.Type())

	}
}

func TestInheritanceDiscriminatorUseSerializationSecondVariant(t *testing.T) {
	data := []byte(`{"box":{"type":"large"}}`)

	var storage Storage
	if err := json.Unmarshal(data, &storage); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	switch e := storage.Box.(type) {
	case SmallBox:
		t.Errorf("Expected type to be 'large' but got %s", e.Type())
	case LargeBox:
		if e.Type() != "large" {
			t.Errorf("Expected type to be 'large' but got %s", e.Type())
		}
	}
}
