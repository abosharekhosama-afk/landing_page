import React from "react";

function QuantityControl({ quantity, onDecrease, onIncrease }) {
  return (
    <div className="quantity-control" aria-label="Quantity control">
      <button onClick={onDecrease} type="button">
        -
      </button>
      <span>{quantity}</span>
      <button onClick={onIncrease} type="button">
        +
      </button>
    </div>
  );
}

export default QuantityControl;
