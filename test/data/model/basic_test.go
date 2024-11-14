package modeltest

import (
	"encoding/json"
	"testing"
)

func TestBasicSerialization(t *testing.T) {
	pet := Pet{
		Name: "Buddy",
		Age:  5,
	}

	data, err := json.Marshal(pet)
	if err != nil {
		t.Fatalf("Failed to marshal pet: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal serialized pet: %v", err)
	}

	if result["name"] != "Buddy" {
		t.Errorf("Expected name to be 'Buddy' but got %v", result["name"])
	}
	if result["age"] != float64(5) { // JSON numbers are unmarshaled as float64
		t.Errorf("Expected age to be 5 but got %v", result["age"])
	}
}

func TestBasicDeserialization(t *testing.T) {
	data := []byte(`{"name":"Buddy","age":5}`)

	var pet Pet
	err := json.Unmarshal(data, &pet)
	if err != nil {
		t.Fatalf("Failed to unmarshal pet: %v", err)
	}

	if pet.Name != "Buddy" {
		t.Errorf("Expected name to be Buddy, but got %s", pet.Name)
	}
	if pet.Age != 5 {
		t.Errorf("Expected age to be 5, but got %d", pet.Age)
	}
}

func TestPetPartialDeserialization(t *testing.T) {
	data := []byte(`{"name":"Buddy"}`)

	var pet Pet
	err := json.Unmarshal(data, &pet)
	if err != nil {
		t.Fatalf("Failed to unmarshal pet: %v", err)
	}

	if pet.Name != "Buddy" {
		t.Errorf("Expected name to be Buddy, but got %s", pet.Name)
	}
	if pet.Age != 0 {
		t.Errorf("Expected age to be 0, but got %d", pet.Age)
	}
}
