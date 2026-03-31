import React from "react";

export const Header = () => {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-4xl font-bold text-transparent bg-primary bg-clip-text">
        TodoX
      </h1>

      <p className="text-muted-foreground">
        Nothing is too hard if you&apos;re willing to do it 💪
      </p>
    </div>
  );
};