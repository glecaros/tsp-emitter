package discriminator

import "encoding/json"

type Cat struct {
	Meow string
}

func (c Cat) Kind() string {
	return "cat"
}

func (m *Cat) UnmarshalJSON(data []byte) error {
	var rawMsg map[string]json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}
	if v, ok := rawMsg["meow"]; ok {
		if err := json.Unmarshal(v, &m.Meow); err != nil {
			return err
		}
	}
	return nil
}

func (m Cat) MarshalJSON() ([]byte, error) {
	obj := map[string]interface{}{
		"kind": "cat",
		"meow": m.Meow,
	}

	return json.Marshal(obj)
}

type Dog struct {
	Bark string
}

func (d Dog) Kind() string {
	return "dog"
}

func (m *Dog) UnmarshalJSON(data []byte) error {
	var rawMsg map[string]json.RawMessage
	if err := json.Unmarshal(data, &rawMsg); err != nil {
		return err
	}
	if v, ok := rawMsg["bark"]; ok {
		if err := json.Unmarshal(v, &m.Bark); err != nil {
			return err
		}
	}
	return nil
}

func MarshalJSON(m Dog) ([]byte, error) {
	obj := map[string]interface{}{
		"kind": "dog",
		"bark": m.Bark,
	}

	return json.Marshal(obj)
}

type Pet interface {
	Kind() string
}

func UnmarshalPet(data []byte) (Pet, error) {
	var typeCheck struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &typeCheck); err != nil {
		return nil, err
	}

	var result Pet
	switch typeCheck.Type {
	case "cat":
		var v Cat
		if err := json.Unmarshal(data, &v); err != nil {
			return nil, err
		}
		result = v
	case "dog":
		var v Dog
		if err := json.Unmarshal(data, &v); err != nil {
			return nil, err
		}
		result = v
	}
	return result, nil
}
