package generalunion

import "encoding/json"

// This file is generated by the typespec compiler. Do not edit.

type Alloy struct {
	Name       string
	Percentage float64
}

func (m *Alloy) UnmarshalJSON(data []byte) error {
	var rawMsg map[string]json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}
	if v, ok := rawMsg["name"]; ok {
		if err := json.Unmarshal(v, &m.Name); err != nil {
			return err
		}
	}
	if v, ok := rawMsg["percentage"]; ok {
		if err := json.Unmarshal(v, &m.Percentage); err != nil {
			return err
		}
	}
	return nil
}

func (m Alloy) MarshalJSON() ([]byte, error) {
	obj := map[string]interface{}{
		"name":       m.Name,
		"percentage": m.Percentage,
	}

	return json.Marshal(obj)
}

type MetalStringValues string

const (
	MetalStringValuesIron   MetalStringValues = "iron"
	MetalStringValuesSilver MetalStringValues = "silver"
)

func (f *MetalStringValues) UnmarshalJSON(data []byte) error {
	var v string
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	*f = MetalStringValues(v)
	return nil
}

func (f MetalStringValues) MarshalJSON() ([]byte, error) {
	return json.Marshal(f)
}

type Metal interface {
	Type() string
}

type MetalAlloy struct {
	Value Alloy
}

func (v MetalAlloy) Type() string {
	return "Alloy"
}

type MetalMetalStringValues struct {
	Value MetalStringValues
}

func (v MetalMetalStringValues) Type() string {
	return "MetalStringValues"
}

func UnmarshalMetal(data []byte) (Metal, error) {
	var err error

	var alloy Alloy
	if err = json.Unmarshal(data, &alloy); err == nil {
		return MetalAlloy{Value: alloy}, nil
	}

	var metalStringValues MetalStringValues
	if err = json.Unmarshal(data, &metalStringValues); err == nil {
		return MetalMetalStringValues{Value: metalStringValues}, nil
	}

	return nil, err
}
