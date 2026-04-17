"use client";

import React from "react";

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface ProductFAQItem {
  question: string;
  answer: string;
}

export interface ProductFAQAccordionProps {
  faqs: ProductFAQItem[];
  title?: string;
  lang?: string;
  className?: string;
}

export function ProductFAQAccordion({
  faqs,
  title = "FAQ",
  lang,
  className,
}: ProductFAQAccordionProps) {
  return React.createElement(
    "section",
    { className, ...(lang ? { lang } : {}) },
    React.createElement(
      "div",
      { className: "mx-auto max-w-3xl" },
      React.createElement(
        "div",
        { className: "mb-8 text-center" },
        React.createElement(
          "h2",
          { className: "text-3xl font-bold tracking-tight text-foreground md:text-4xl" },
          title
        )
      ),
      React.createElement(
        Accordion,
        { defaultValue: faqs.length > 0 ? ["faq-0"] : [] },
        faqs.map((faq, index) =>
          React.createElement(
            AccordionItem,
            { key: `${faq.question}-${index}`, value: `faq-${index}` },
            React.createElement(
              AccordionHeader,
              null,
              React.createElement(AccordionTrigger, null, faq.question)
            ),
            React.createElement(AccordionPanel, null, faq.answer)
          )
        )
      )
    )
  );
}
