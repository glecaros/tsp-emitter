package modeltest

import (
	"encoding/json"
	"testing"
)

func TestReferencesSerialization(t *testing.T) {
	home := Home{
		Dog: Dog{
			Name: "Rex",
			Age:  3,
		},
	}

	data, err := json.Marshal(home)
	if err != nil {
		t.Fatalf("Failed to marshal Home: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal serialized Home: %v", err)
	}

	dog := result["dog"].(map[string]interface{})
	if dog["name"] != "Rex" {
		t.Errorf("Expected dog name to be 'Rex' but got %v", dog["name"])
	}
	if dog["age"] != float64(3) {
		t.Errorf("Expected dog age to be 3 but got %v", dog["age"])
	}
}

func TestReferencesDeserialization(t *testing.T) {
	data := []byte(`{"dog":{"name":"Rex","age":3}}`)

	var home Home
	if err := json.Unmarshal(data, &home); err != nil {
		t.Fatalf("Failed to unmarshal Home: %v", err)
	}

	if home.Dog.Name != "Rex" {
		t.Errorf("Expected dog name to be 'Rex' but got %s", home.Dog.Name)
	}
	if home.Dog.Age != 3 {
		t.Errorf("Expected dog age to be 3 but got %d", home.Dog.Age)
	}
}
