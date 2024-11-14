package modeltest

import "encoding/json"

// This file is generated by the typespec compiler. Do not edit.
type PolarBear struct {
	Size string
}

func (m PolarBear) Type() string {
	return "polar"
}

func (m *PolarBear) UnmarshalJSON(data []byte) error {
	var rawMsg map[string]json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}
	if v, ok := rawMsg["size"]; ok {
		if err := json.Unmarshal(v, &m.Size); err != nil {
			return err
		}
	}
	return nil
}

func (m PolarBear) MarshalJSON() ([]byte, error) {
	obj := map[string]interface{}{
		"type": "polar",
		"size": m.Size,
	}

	return json.Marshal(obj)
}

type GrizzlyBear struct {
	Size string
}

func (m GrizzlyBear) Type() string {
	return "grizzly"
}

func (m *GrizzlyBear) UnmarshalJSON(data []byte) error {
	var rawMsg map[string]json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}
	if v, ok := rawMsg["size"]; ok {
		if err := json.Unmarshal(v, &m.Size); err != nil {
			return err
		}
	}
	return nil
}

func (m GrizzlyBear) MarshalJSON() ([]byte, error) {
	obj := map[string]interface{}{
		"type": "grizzly",
		"size": m.Size,
	}

	return json.Marshal(obj)
}

type Bear interface {
	Type() string
}

func UnmarshalBear(data []byte) (Bear, error) {
	var typeCheck struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &typeCheck); err != nil {
		return nil, err
	}

	var result Bear
	switch typeCheck.Type {
	case "polar":
		var v PolarBear
		if err := json.Unmarshal(data, &v); err != nil {
			return nil, err
		}
		result = v

	case "grizzly":
		var v GrizzlyBear
		if err := json.Unmarshal(data, &v); err != nil {
			return nil, err
		}
		result = v

	}
	return result, nil
}