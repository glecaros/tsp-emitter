package modeltest

import (
	"encoding/json"
	"testing"
)

func TestOptionalSerializationWithFieldPresent(t *testing.T) {
	cat := Cat{
		Name:     "Whiskers",
		Nickname: Ptr("Whisky"),
	}

	data, err := json.Marshal(cat)
	if err != nil {
		t.Fatalf("Failed to marshal Cat: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal serialized Cat: %v", err)
	}

	if result["name"] != "Whiskers" {
		t.Errorf("Expected name to be 'Whiskers' but got %v", result["name"])
	}
	if result["nickname"] != "Whisky" {
		t.Errorf("Expected nickname to be 'Whisky' but got %v", result["nickname"])
	}
}

func TestOptionalSerializationWithFieldAbsent(t *testing.T) {
	cat := Cat{
		Name: "Whiskers",
	}

	data, err := json.Marshal(cat)
	if err != nil {
		t.Fatalf("Failed to marshal Cat: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal serialized Cat: %v", err)
	}

	if result["name"] != "Whiskers" {
		t.Errorf("Expected name to be 'Whiskers' but got %v", result["name"])
	}
	if _, ok := result["nickname"]; ok {
		t.Error("Expected nickname to be absent")
	}
}

func TestOptionalDeserializationWithFieldPresent(t *testing.T) {
	data := []byte(`{"name":"Whiskers","nickname":"Whisky"}`)

	var cat Cat
	if err := json.Unmarshal(data, &cat); err != nil {
		t.Fatalf("Failed to unmarshal Cat: %v", err)
	}

	if cat.Name != "Whiskers" {
		t.Errorf("Expected name to be 'Whiskers' but got %s", cat.Name)
	}
	if *cat.Nickname != "Whisky" {
		t.Errorf("Expected nickname to be 'Whisky' but got %s", *cat.Nickname)
	}
}

func TestOptionalDeserializationWithFieldAbsent(t *testing.T) {
	data := []byte(`{"name":"Whiskers"}`)

	var cat Cat
	if err := json.Unmarshal(data, &cat); err != nil {
		t.Fatalf("Failed to unmarshal Cat: %v", err)
	}

	if cat.Name != "Whiskers" {
		t.Errorf("Expected name to be 'Whiskers' but got %s", cat.Name)
	}
	if cat.Nickname != nil {
		t.Error("Expected nickname to be unset")
	}
}
