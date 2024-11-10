package modeltest

import "encoding/json"

// This file is generated by the typespec compiler. Do not edit.
type Room struct {
	Seating []Seating
}

func (m *Room) UnmarshalJSON(data []byte) error {
	var rawMsg map[string]json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}
	if v, ok := rawMsg["seating"]; ok {
		if err := json.Unmarshal(v, &m.Seating); err != nil {
			return err
		}
	}
	return nil
}

func (m Room) MarshalJSON() ([]byte, error) {
	obj := map[string]interface{}{
		"seating": m.Seating,
	}

	return json.Marshal(obj)
}

type Chair struct {
	Legs int64
}

func (m Chair) Type() string {
	return "chair"
}

func (m *Chair) UnmarshalJSON(data []byte) error {
	var rawMsg map[string]json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}
	if v, ok := rawMsg["legs"]; ok {
		if err := json.Unmarshal(v, &m.Legs); err != nil {
			return err
		}
	}
	return nil
}

func (m Chair) MarshalJSON() ([]byte, error) {
	obj := map[string]interface{}{
		"type": "chair",
		"legs": m.Legs,
	}

	return json.Marshal(obj)
}

type Bench struct {
	Length int64
}

func (m Bench) Type() string {
	return "bench"
}

func (m *Bench) UnmarshalJSON(data []byte) error {
	var rawMsg map[string]json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}
	if v, ok := rawMsg["length"]; ok {
		if err := json.Unmarshal(v, &m.Length); err != nil {
			return err
		}
	}
	return nil
}

func (m Bench) MarshalJSON() ([]byte, error) {
	obj := map[string]interface{}{
		"type":   "bench",
		"length": m.Length,
	}

	return json.Marshal(obj)
}

type Seating interface {
	Type() string
}

func UnmarshalSeating(data []byte) (Seating, error) {
	var typeCheck struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &typeCheck); err != nil {
		return nil, err
	}

	var result Seating
	switch typeCheck.Type {
	case "chair":
		var v Chair
		if err := json.Unmarshal(data, &v); err != nil {
			return nil, err
		}
		result = v

	case "bench":
		var v Bench
		if err := json.Unmarshal(data, &v); err != nil {
			return nil, err
		}
		result = v

	}
	return result, nil
}
