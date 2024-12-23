package mynamespace

import "encoding/json"

// This file is generated by the typespec compiler. Do not edit.

type NumberNoScalar int64

const (
	NumberNoScalarVariant1 NumberNoScalar = 4
	NumberNoScalarVariant2 NumberNoScalar = 2
)

func (f *NumberNoScalar) UnmarshalJSON(data []byte) error {
	var v int64
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	*f = NumberNoScalar(v)
	return nil
}

func (f NumberNoScalar) MarshalJSON() ([]byte, error) {

	return json.Marshal(f)
}
