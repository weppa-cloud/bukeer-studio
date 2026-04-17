"use client";

import React from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";

import { cn } from "@/lib/utils";

const AccordionRoot = AccordionPrimitive.Root as unknown as React.ElementType;
const AccordionItemPrimitive = AccordionPrimitive.Item as unknown as React.ElementType;
const AccordionHeaderPrimitive = AccordionPrimitive.Header as unknown as React.ElementType;
const AccordionTriggerPrimitive = AccordionPrimitive.Trigger as unknown as React.ElementType;
const AccordionPanelPrimitive = AccordionPrimitive.Panel as unknown as React.ElementType;

function Accordion<Value = any>({
  className,
  ...props
}: AccordionPrimitive.Root.Props<Value>) {
  return React.createElement(AccordionRoot, {
    "data-slot": "accordion",
    className: cn("flex flex-col gap-3", className),
    ...props,
  });
}

function AccordionItem({
  className,
  ...props
}: AccordionPrimitive.Item.Props) {
  return React.createElement(AccordionItemPrimitive, {
    "data-slot": "accordion-item",
    className: cn(
      "overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm",
      className
    ),
    ...props,
  });
}

function AccordionHeader({
  className,
  ...props
}: AccordionPrimitive.Header.Props) {
  return React.createElement(AccordionHeaderPrimitive, {
    "data-slot": "accordion-header",
    className: cn("m-0", className),
    ...props,
  });
}

function AccordionTrigger({
  className,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return React.createElement(AccordionTriggerPrimitive, {
    "data-slot": "accordion-trigger",
    className: cn(
      "flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none",
      className
    ),
    ...props,
  });
}

function AccordionPanel({
  className,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return React.createElement(AccordionPanelPrimitive, {
    "data-slot": "accordion-panel",
    className: cn("px-5 pb-5 pt-0 text-sm leading-7 text-muted-foreground", className),
    ...props,
  });
}

export { Accordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionPanel };
