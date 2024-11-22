package modeltest

import (
	"testing"
	"time"
)

func TestDurationSerialization(t *testing.T) {
	meeting := Meeting{Duration: 30 * time.Second}
	data, err := meeting.MarshalJSON()
	if err != nil {
		t.Errorf("Failed to marshal Meeting: %v", err)
	}
	expected := `{"duration":"30s"}`
	if string(data) != expected {
		t.Errorf("Expected %v, got %v", expected, string(data))
	}
}

func TestDurationDeserialization(t *testing.T) {
	data := []byte(`{"duration":"30s"}`)
	var meeting Meeting
	err := meeting.UnmarshalJSON(data)
	if err != nil {
		t.Errorf("Failed to unmarshal Meeting: %v", err)
	}
	if meeting.Duration != 30*time.Second {
		t.Errorf("Expected 30s, got %v", meeting.Duration)
	}
}
